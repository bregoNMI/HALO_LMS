def user_info(request):
    if request.user.is_authenticated:
        first_name = request.user.first_name
        first_letter_lowercase = first_name[0].lower() if first_name else ''
        
        return {
            'first_name': first_name,
            'last_name': request.user.last_name,
            'email': request.user.email,
            'first_letter_lowercase': first_letter_lowercase,  # Add this key
        }
    return {}