export function customerAuthError(error:unknown):string{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 if(code==='email_not_confirmed')return 'Verify your email before signing in. Check your inbox and spam folder.';
 if(code==='invalid_credentials')return 'Check your email and password, then try again.';
 if(code==='user_already_exists'||code==='email_exists')return 'An account already uses this email. Sign in or reset your password.';
 if(code==='weak_password')return 'Choose a stronger password with at least eight characters.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return 'Please wait a few minutes before trying again.';
 return 'We could not complete this request. Please try again shortly.';
}
