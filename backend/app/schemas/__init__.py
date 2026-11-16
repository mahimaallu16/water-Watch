from app.schemas.common import MessageResponse, PaginatedResponse, LocationCoords
from app.schemas.user import UserRegister, UserLogin, Token, UserOut, UserUpdate, WorkerUpdate, WorkerProfileOut
from app.schemas.report import ReportCreate, ReportUpdate, ReportOut, ReportImageOut, DuplicateCandidateOut, DuplicateReviewRequest, AdditionalEvidenceSubmit
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentOut, IncidentDetailOut, ReportIncidentLinkCreate
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentOut, RepairUpdateCreate, RepairUpdateOut, RepairEvidenceCreate, RepairEvidenceOut, VerificationRequest
from app.schemas.ai import AISuggestionOut, AISuggestionReview, ImageAnalysisResult, DuplicateDetectionResult, PriorityRecommendationResult, WorkerRecommendationResult
from app.schemas.notification import NotificationOut
from app.schemas.analytics import DashboardKPIs, CategoryStat, StatusStat, SeverityStat, ZoneStat, TrendDataPoint, WorkerPerformanceStat
from app.schemas.audit import StatusHistoryOut, AuditLogOut

__all__ = [
    "MessageResponse", "PaginatedResponse", "LocationCoords",
    "UserRegister", "UserLogin", "Token", "UserOut", "UserUpdate", "WorkerUpdate", "WorkerProfileOut",
    "ReportCreate", "ReportUpdate", "ReportOut", "ReportImageOut", "DuplicateCandidateOut", "DuplicateReviewRequest", "AdditionalEvidenceSubmit",
    "IncidentCreate", "IncidentUpdate", "IncidentOut", "IncidentDetailOut", "ReportIncidentLinkCreate",
    "AssignmentCreate", "AssignmentUpdate", "AssignmentOut", "RepairUpdateCreate", "RepairUpdateOut", "RepairEvidenceCreate", "RepairEvidenceOut", "VerificationRequest",
    "AISuggestionOut", "AISuggestionReview", "ImageAnalysisResult", "DuplicateDetectionResult", "PriorityRecommendationResult", "WorkerRecommendationResult",
    "NotificationOut",
    "DashboardKPIs", "CategoryStat", "StatusStat", "SeverityStat", "ZoneStat", "TrendDataPoint", "WorkerPerformanceStat",
    "StatusHistoryOut", "AuditLogOut"
]

