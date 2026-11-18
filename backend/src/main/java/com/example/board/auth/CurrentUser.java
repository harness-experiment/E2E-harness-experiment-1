package com.example.board.auth;

import com.example.board.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
  static final String USER_ID = "memberId";

  public long requireId(HttpServletRequest request) {
    var session = request.getSession(false);
    if (session == null || !(session.getAttribute(USER_ID) instanceof Long id)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    return id;
  }
}
