from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


class NotFound(AppException):
    def __init__(self, entity: str = "Resource"):
        super().__init__("NOT_FOUND", f"{entity} not found", status.HTTP_404_NOT_FOUND)


class Unauthorized(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("UNAUTHORIZED", message, status.HTTP_401_UNAUTHORIZED)


class Forbidden(AppException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__("FORBIDDEN", message, status.HTTP_403_FORBIDDEN)


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__("VALIDATION_ERROR", message, status.HTTP_422_UNPROCESSABLE_ENTITY)


class Conflict(AppException):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, status.HTTP_409_CONFLICT)


class RateLimited(AppException):
    def __init__(self):
        super().__init__("RATE_LIMITED", "Too many requests. Please try again later.", status.HTTP_429_TOO_MANY_REQUESTS)
