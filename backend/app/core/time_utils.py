from decimal import Decimal, ROUND_HALF_UP


def time_to_hours(value) -> Decimal:
    """
    Convert HH:MM:SS or HH:MM (or a plain hour number) to decimal hours.
    """
    text = str(value).strip()
    if ":" not in text:
        return Decimal(text)

    parts = text.split(":")
    if len(parts) == 3:
        hours, minutes, seconds = (Decimal(part) for part in parts)
        return hours + (minutes / Decimal(60)) + (seconds / Decimal(3600))
    if len(parts) == 2:
        hours, minutes = (Decimal(part) for part in parts)
        return hours + (minutes / Decimal(60))
    raise ValueError(f"Unrecognized time value: {value}")


def hours_to_clock(hours: Decimal) -> str:
    """Format decimal hours as HHH:MM:SS. Hours are not wrapped into days."""
    total_seconds = int((Decimal(str(hours)) * Decimal(3600)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if total_seconds < 0:
        total_seconds = 0
    whole_hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{whole_hours:02d}:{minutes:02d}:{seconds:02d}"
