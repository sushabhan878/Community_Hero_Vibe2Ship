from pydantic import BaseModel


class Pagination(BaseModel):
    page: int
    limit: int
    total: int
    has_more: bool
