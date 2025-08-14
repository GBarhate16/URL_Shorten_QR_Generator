from users.models import CustomUser


def main() -> None:
    users = (
        CustomUser.objects
        .exclude(email__isnull=True)
        .exclude(email="")
        .order_by("email", "id")
    )

    seen_emails: set[str] = set()
    duplicate_ids: list[int] = []

    for user in users:
        key = (user.email or "").strip().lower()
        if not key:
            continue
        if key in seen_emails:
            duplicate_ids.append(user.id)
        else:
            seen_emails.add(key)

    if duplicate_ids:
        CustomUser.objects.filter(id__in=duplicate_ids).delete()
        print(f"Removed {len(duplicate_ids)} duplicate user(s) by email")
    else:
        print("No duplicate users by email detected")


if __name__ == "__main__":
    main()


