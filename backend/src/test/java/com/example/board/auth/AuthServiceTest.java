package com.example.board.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.board.shared.ApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {
  private final MemberRepository members = mock(MemberRepository.class);
  private final PasswordEncoder passwords = mock(PasswordEncoder.class);
  private final AuthService auth = new AuthService(members, passwords);

  @Test
  void rejectedPasswordDoesNotReturnUser() {
    when(members.findByEmail("a@example.test"))
        .thenReturn(Optional.of(new MemberRepository.Member(1, "a@example.test", "hash")));
    when(passwords.matches("wrong", "hash")).thenReturn(false);
    var error = assertThrows(ApiException.class, () -> auth.login("a@example.test", "wrong"));
    assertEquals(HttpStatus.UNAUTHORIZED, error.status());
  }

  @Test
  void duplicateEmailReturnsConflict() {
    when(passwords.encode("password")).thenReturn("hash");
    when(members.insert("a@example.test", "hash"))
        .thenThrow(new DuplicateKeyException("duplicate"));
    var error = assertThrows(ApiException.class, () -> auth.signup("a@example.test", "password"));
    assertEquals(HttpStatus.CONFLICT, error.status());
  }

  @Test
  void oversizedUtf8PasswordIsRejectedBeforeHashing() {
    var error =
        assertThrows(ApiException.class, () -> auth.signup("a@example.test", "가".repeat(25)));
    assertEquals(HttpStatus.BAD_REQUEST, error.status());
    verifyNoInteractions(passwords, members);
  }

  @Test
  void missingMemberCannotAuthenticate() {
    when(members.findByEmail("missing@example.test")).thenReturn(Optional.empty());
    assertThrows(ApiException.class, () -> auth.login("missing@example.test", "password"));
    verifyNoInteractions(passwords);
  }
}
