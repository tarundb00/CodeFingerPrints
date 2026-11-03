package com.example.codeFingerPrint.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.JWTVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtils {

  @Value("${jwt.secret}")
  private String jwtSecret;

  @Value("${jwt.legacy-secret:}")
  private String legacyJwtSecret;

  @Value("${jwt.expirationMs}")
  private long jwtExpirationMs;

  public String generateJwtToken(Authentication authentication) {
    String username = authentication.getName();
    Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
    return JWT.create()
        .withSubject(username)
        .withIssuedAt(new Date())
        .withExpiresAt(new Date(System.currentTimeMillis() + jwtExpirationMs))
        .sign(algorithm);
  }

  public String getUsernameFromJwtToken(String token) {
    try {
      return getVerifier().verify(token).getSubject();
    } catch (JWTVerificationException primaryFailure) {
      if (legacyJwtSecret == null || legacyJwtSecret.isBlank()) throw primaryFailure;
      return JWT.require(Algorithm.HMAC256(legacyJwtSecret)).build().verify(token).getSubject();
    }
  }

  public boolean validateJwtToken(String token) {
    try {
      getVerifier().verify(token);
      return true;
    } catch (JWTVerificationException ex) {
      if (legacyJwtSecret == null || legacyJwtSecret.isBlank()) return false;
      try {
        JWT.require(Algorithm.HMAC256(legacyJwtSecret)).build().verify(token);
        return true;
      } catch (JWTVerificationException legacyFailure) {
        return false;
      }
    }
  }

  private JWTVerifier getVerifier() {
    return JWT.require(Algorithm.HMAC256(jwtSecret)).build();
  }
}
