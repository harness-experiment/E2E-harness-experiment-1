package com.example.board.auth;

import com.example.board.shared.ApiException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  public record User(long id, String email) {}

  private final MemberRepository members;
  private final PasswordEncoder passwords;

  public AuthService(MemberRepository members, PasswordEncoder passwords) {
    this.members = members;
    this.passwords = passwords;
  }

  @Transactional
  public User signup(String email, String password) {
    try {
      var member = members.insert(email, passwords.encode(password));
      return new User(member.id(), member.email());
    } catch (DuplicateKeyException exception) {
      throw new ApiException(HttpStatus.CONFLICT, "이미 가입한 이메일입니다.");
    }
  }

  public User login(String email, String password) {
    var member =
        members
            .findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요."));
    if (!passwords.matches(password, member.passwordHash())) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.");
    }
    return new User(member.id(), member.email());
  }

  public User find(long id) {
    var member =
        members
            .findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
    return new User(member.id(), member.email());
  }
}
