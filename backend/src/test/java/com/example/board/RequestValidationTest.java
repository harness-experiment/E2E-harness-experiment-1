package com.example.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RequestValidationTest {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @Test
  void missingCsrfCannotCreateMember() throws Exception {
    long before = jdbc.queryForObject("SELECT COUNT(*) FROM members", Long.class);
    mvc.perform(
            post("/api/auth/signup")
                .contentType("application/json")
                .content("{\"email\":\"csrf@example.test\",\"password\":\"sample\"}"))
        .andExpect(status().isForbidden());
    assertEquals(before, jdbc.queryForObject("SELECT COUNT(*) FROM members", Long.class));
  }

  @Test
  void invalidInputCannotCreateMember() throws Exception {
    long before = jdbc.queryForObject("SELECT COUNT(*) FROM members", Long.class);
    mvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType("application/json")
                .content("{\"email\":\"not-an-email\",\"password\":\"\"}"))
        .andExpect(status().isBadRequest());
    assertEquals(before, jdbc.queryForObject("SELECT COUNT(*) FROM members", Long.class));
  }
}
