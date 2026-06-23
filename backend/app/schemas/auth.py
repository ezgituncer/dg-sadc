from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordChangeRequest(BaseModel):
    """Self-service password change — requires the user's current password."""

    model_config = ConfigDict(str_strip_whitespace=True)

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
