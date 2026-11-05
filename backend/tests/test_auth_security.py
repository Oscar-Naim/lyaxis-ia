import os
import sys
import unittest
import time
import base64
import hmac
import hashlib
from datetime import datetime, timezone

# Añadir el directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["AUTH_SECRET"] = "lyaxis-test-secret-key-must-be-at-least-32-chars-long"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:5173,https://lyaxis-ia.vercel.app"

from main import (
    sign_user_token,
    verify_user_token,
    _AUTH_SECRET,
    otp_storage,
    check_general_rate_limit,
    _request_rate_records,
    _assert_conversation_access,
    verify_otp_code,
    VerifyOtpPayload,
    db
)
from fastapi import HTTPException

class MockRequest:
    def __init__(self, headers=None, query_params=None, client_host="127.0.0.1"):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.client = type("Client", (), {"host": client_host})()

class TestAuthSecurity(unittest.TestCase):
    def setUp(self):
        otp_storage.clear()
        _request_rate_records.clear()
        try:
            db.execute("DELETE FROM conversations WHERE id LIKE 'conv-sec-%'")
        except Exception:
            pass

    def test_token_signing_and_verification(self):
        uid = "user-test-uuid-12345"
        token = sign_user_token(uid)
        self.assertIsNotNone(token)
        self.assertIn(".", token)

        verified = verify_user_token(token)
        self.assertEqual(verified, uid)

    def test_token_tampering_rejected(self):
        uid = "user-test-uuid-12345"
        token = sign_user_token(uid)
        payload, sig = token.split(".", 1)

        tampered_sig = sig[:-2] + "ff"
        tampered_token = f"{payload}.{tampered_sig}"
        self.assertIsNone(verify_user_token(tampered_token))

        tampered_token2 = f"dGVzdA.{sig}"
        self.assertIsNone(verify_user_token(tampered_token2))

    def test_token_expiration(self):
        uid = "expired-user"
        exp = int(time.time()) - 100
        raw_payload = f"{uid}|{exp}".encode("utf-8")
        b64_payload = base64.urlsafe_b64encode(raw_payload).decode("ascii").rstrip("=")
        sig = hmac.new(_AUTH_SECRET, b64_payload.encode("ascii"), hashlib.sha256).hexdigest()
        expired_token = f"{b64_payload}.{sig}"

        self.assertIsNone(verify_user_token(expired_token))

    def test_rate_limiting_triggers_429(self):
        ip = "192.168.1.100"
        for _ in range(10):
            check_general_rate_limit(ip, max_requests=10, window_seconds=60)

        with self.assertRaises(HTTPException) as ctx:
            check_general_rate_limit(ip, max_requests=10, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)

    def test_direct_otp_backdoor_removed(self):
        payload = VerifyOtpPayload(contact="victim@example.com", code="direct")
        with self.assertRaises(HTTPException) as ctx:
            verify_otp_code(payload)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_conversation_access_requires_token_for_registered_user(self):
        cid = "conv-sec-101"
        real_owner = "user-real-999"
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (cid, real_owner, "Privado", "speed", now, now)
        )

        # Intento de acceso sin token pasando solo ?user_id=
        req_unauth = MockRequest(query_params={"user_id": real_owner})
        with self.assertRaises(HTTPException) as ctx:
            _assert_conversation_access(cid, req_unauth)
        self.assertEqual(ctx.exception.status_code, 401)

        # Intento de acceso con token de otro usuario
        other_token = sign_user_token("user-attacker-666")
        req_attacker = MockRequest(headers={"authorization": f"Bearer {other_token}"})
        with self.assertRaises(HTTPException) as ctx:
            _assert_conversation_access(cid, req_attacker)
        self.assertEqual(ctx.exception.status_code, 403)

        # Acceso con token legítimo del propietario
        valid_token = sign_user_token(real_owner)
        req_legit = MockRequest(headers={"authorization": f"Bearer {valid_token}"})
        caller = _assert_conversation_access(cid, req_legit)
        self.assertEqual(caller, real_owner)

if __name__ == "__main__":
    unittest.main()
