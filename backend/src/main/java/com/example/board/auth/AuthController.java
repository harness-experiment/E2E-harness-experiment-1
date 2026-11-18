package com.example.board.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  public record Credentials(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {}

  public record CsrfResponse(String token, String headerName) {}

  private final AuthService auth;
  private final CurrentUser currentUser;

  public AuthController(AuthService auth, CurrentUser currentUser) {
    this.auth = auth;
    this.currentUser = currentUser;
  }

  @GetMapping("/csrf")
  CsrfResponse csrf(CsrfToken token) {
    return new CsrfResponse(token.getToken(), token.getHeaderName());
  }

  @PostMapping("/signup")
  @ResponseStatus(HttpStatus.CREATED)
  AuthService.User signup(@Valid @RequestBody Credentials input) {
    return auth.signup(input.email(), input.password());
  }

  @PostMapping("/login")
  AuthService.User login(@Valid @RequestBody Credentials input, HttpServletRequest request) {
    var user = auth.login(input.email(), input.password());
    request.getSession();
    request.changeSessionId();
    request.getSession().setAttribute(CurrentUser.USER_ID, user.id());
    return user;
  }

  @GetMapping("/me")
  AuthService.User me(HttpServletRequest request) {
    return auth.find(currentUser.requireId(request));
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void logout(HttpServletRequest request) {
    var session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }
  }
}
