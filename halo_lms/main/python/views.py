from django.contrib.auth.decorators import login_required
from django.shortcuts import render
import boto3
import requests
from jose import jwt, JWTError
from django.http import JsonResponse

@login_required
def login(request):
    return render(request, 'halo_lms/main/html/login.html')

def get_cognito_public_keys(region, user_pool_id):
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    response = requests.get(keys_url)
    response.raise_for_status()
    keys = response.json()
    return {key['kid']: key for key in keys['keys']}

def decode_jwt_with_public_key(id_token, public_keys, expected_issuer, expected_audience):
    headers = jwt.get_unverified_headers(id_token)
    kid = headers['kid']
    key = public_keys.get(kid)
    
    if not key:
        raise Exception(f'Public key not found for key ID: {kid}')
    
    try:
        # Decode and verify the JWT using the public key
        claims = jwt.decode(
            id_token,
            key,
            algorithms=['RS256'],
            audience=expected_audience,
            issuer=expected_issuer
        )
        print("Token claims:", claims)
        return claims
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.JWTClaimsError:
        raise Exception('Invalid claims, please check the audience and issuer')
    except JWTError as e:
        raise Exception('Unable to parse authentication token.') from e

def authenticate_user(username, password):
    client = boto3.client('cognito-idp', region_name='us-east-1')
    try:
        response = client.initiate_auth(
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password,
            },
            ClientId='eokheqvqgjr7lcocjkpkqchou',
        )
        print('Full response:', response)
        id_token = response['AuthenticationResult']['IdToken']
        
        public_keys = get_cognito_public_keys('us-east-1', 'us-east-1_eSXeg2fIu')
        
        # Expected issuer and audience
        expected_issuer = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_eSXeg2fIu'
        expected_audience = 'eokheqvqgjr7lcocjkpkqchou'
        
        claims = decode_jwt_with_public_key(id_token, public_keys, expected_issuer, expected_audience)
        return claims
    except client.exceptions.NotAuthorizedException as e:
        print(f"Authentication failed: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        # Authenticate user with Cognito
        user_claims = authenticate_user(username, password)

        if user_claims:
            # Optionally, store user claims in session or database
            return JsonResponse({'message': 'Login successful: VAMOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOS', 'user_claims': user_claims})
        else:
            return JsonResponse({'message': 'Login failed. Invalid credentials.'}, status=401)
    else:
        return JsonResponse({'message': 'Method not allowed'}, status=405)