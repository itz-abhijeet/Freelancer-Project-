from datetime import datetime
import math

from database import execute_query

# ==============================================================================
# 4. Core Business Logic (Migrated from JS to Python)
# ==============================================================================

def calculate_total_time(project_id):
    """Calculates total time (in milliseconds) logged for a project."""
    logs = execute_query("SELECT StartTime, EndTime FROM TimeLog WHERE ProjectID = %s", (project_id,), fetch=True)
    if not logs:
        return 0

    total_ms = 0
    now = datetime.now()

    for log in logs:
        start_time = log['StartTime']
        end_time = log['EndTime']

        # If EndTime is NULL (running timer), use current time
        end = end_time if end_time else now

        if start_time and end:
            duration = end - start_time
            total_ms += duration.total_seconds() * 1000

    return total_ms

def calculate_total_due(project):
    """Calculates the total due amount for a project."""
    rate = project['RateValue']
    rate_type = project['RateType']

    if rate_type == 'Fixed':
        return float(rate)
    elif rate_type == 'Hourly':
        total_time_ms = calculate_total_time(project['ProjectID'])
        total_hours = total_time_ms / 1000 / 60 / 60
        return total_hours * float(rate)
    return 0.0

def format_time(ms):
    """Converts milliseconds to human-readable string (e.g., '1h 30m')."""
    if ms < 0: return '0h 0m'
    total_seconds = math.floor(ms / 1000)
    hours = math.floor(total_seconds / 3600)
    minutes = math.floor((total_seconds % 3600) / 60)
    return f"{hours}h {minutes}m"
