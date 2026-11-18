package com.example.board;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {
  @Autowired MockMvc mvc;

  @Test
  void registersAndRejectsDuplicateEmail() throws Exception {
    String body =
        """
        {"email":"board-a@example.test","password":"BoardOnly!2026_A"}
        """;
    mvc.perform(post("/api/auth/signup").with(csrf()).contentType("application/json").content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").isNumber())
        .andExpect(jsonPath("$.password").doesNotExist());
    mvc.perform(post("/api/auth/signup").with(csrf()).contentType("application/json").content(body))
        .andExpect(status().isConflict());
  }
}
