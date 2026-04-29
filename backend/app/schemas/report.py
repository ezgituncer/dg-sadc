from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class YearlyReportUserInfo(BaseModel):
    account_id: str
    name: str
    team: str | None


class YearlyReportRow(BaseModel):
    user: YearlyReportUserInfo
    hours_by_month: list[Decimal]
    year_total: Decimal
    breakdown_by_activity: dict[str, list[Decimal]] = {}


class YearlyReport(BaseModel):
    model_config = ConfigDict()

    year: int
    expected_working_days: list[int]
    year_target_hours: Decimal
    rows: list[YearlyReportRow]
    column_totals: list[Decimal]
    grand_total: Decimal
