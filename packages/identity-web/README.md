# Identity Web

Owns the sign-in and session renewal interface. Applications compose `IdentityGate` and receive an access token through its callback. Passwords leave component memory after sign-in. Refresh credentials use a secure HTTP-only cookie issued by Identity. The gateway must enforce same-origin requests.
