package com.example.board;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PostsIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @Test
  void onlyAuthorCanUpdateAndRejectedWritePreservesData() throws Exception {
    jdbc.update("INSERT INTO members(email,password_hash) VALUES ('owner@example.test','unused')");
    long authorId =
        jdbc.queryForObject("SELECT id FROM members WHERE email='owner@example.test'", Long.class);
    MockHttpSession author = new MockHttpSession();
    author.setAttribute("memberId", authorId);
    mvc.perform(
            post("/api/posts")
                .session(author)
                .with(csrf())
                .contentType("application/json")
                .content("{\"title\":\"첫 번째 글\",\"body\":\"안녕하세요.\",\"authorId\":999}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.authorId").value(authorId));
    long postId =
        jdbc.queryForObject("SELECT id FROM posts WHERE author_id=?", Long.class, authorId);
    MockHttpSession other = new MockHttpSession();
    other.setAttribute("memberId", authorId + 1);
    mvc.perform(
            put("/api/posts/" + postId)
                .session(other)
                .with(csrf())
                .contentType("application/json")
                .content("{\"title\":\"도용\",\"body\":\"변경\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/posts/" + postId)).andExpect(jsonPath("$.title").value("첫 번째 글"));
    mvc.perform(delete("/api/posts/" + postId).with(csrf())).andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/posts/" + postId).session(author).with(csrf()))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/posts/" + postId)).andExpect(status().isNotFound());
  }
}
