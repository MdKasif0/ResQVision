from typing import Optional


class AppException(Exception):
    """Base application exception carrying standardized error structure."""

    def __init__(
        self,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
        message: str = "An error occurred while processing the request.",
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class PayloadTooLargeException(AppException):
    def __init__(self, message: str = "Uploaded file exceeds maximum allowed size."):
        super().__init__(
            status_code=413,
            code="PAYLOAD_TOO_LARGE",
            message=message,
        )


class InvalidImageFormatException(AppException):
    def __init__(
        self,
        message: str = "Unsupported media type. Accepted formats are JPEG, PNG, and WebP.",
    ):
        super().__init__(
            status_code=415,
            code="INVALID_IMAGE_FORMAT",
            message=message,
        )


class CorruptImageException(AppException):
    def __init__(
        self,
        message: str = "Uploaded file could not be parsed as a valid image.",
    ):
        super().__init__(
            status_code=400,
            code="CORRUPT_IMAGE",
            message=message,
        )


class EmptyFileException(AppException):
    def __init__(self, message: str = "Uploaded file is empty."):
        super().__init__(
            status_code=400,
            code="EMPTY_FILE",
            message=message,
        )


class NotImplementedException(AppException):
    def __init__(
        self,
        message: str = "Endpoint is not implemented yet in this development phase.",
    ):
        super().__init__(
            status_code=501,
            code="NOT_IMPLEMENTED",
            message=message,
        )


class NotFoundException(AppException):
    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=message,
        )


class ModelNotLoadedException(AppException):
    def __init__(self, message: str = "YOLO detection model is not loaded. Service unavailable."):
        super().__init__(
            status_code=503,
            code="MODEL_NOT_LOADED",
            message=message,
        )


class ServiceUnavailableException(AppException):
    def __init__(self, message: str = "Service is temporarily unavailable."):
        super().__init__(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message=message,
        )

