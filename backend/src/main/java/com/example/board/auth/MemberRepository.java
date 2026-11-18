package com.example.board.auth;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {
  public record Member(long id, String email, String passwordHash) {}

  private final JdbcClient jdbc;

  public MemberRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Member> findByEmail(String email) {
    return jdbc.sql("SELECT id, email, password_hash FROM members WHERE email = :email")
        .param("email", email)
        .query(Member.class)
        .optional();
  }

  public Optional<Member> findById(long id) {
    return jdbc.sql("SELECT id, email, password_hash FROM members WHERE id = :id")
        .param("id", id)
        .query(Member.class)
        .optional();
  }

  public Member insert(String email, String passwordHash) {
    jdbc.sql("INSERT INTO members(email, password_hash) VALUES (:email, :hash)")
        .param("email", email)
        .param("hash", passwordHash)
        .update();
    return findByEmail(email).orElseThrow();
  }
}
