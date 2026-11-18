package com.example.board.post;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PostRepository {
  private static final String SELECT =
      """
      SELECT p.id, p.author_id, m.email AS author_email, p.title, p.body, p.created_at
      FROM posts p JOIN members m ON m.id = p.author_id
      """;
  private final JdbcClient jdbc;

  public PostRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public List<Post> list() {
    return jdbc.sql(SELECT + " ORDER BY p.id DESC").query(Post.class).list();
  }

  public Optional<Post> find(long id) {
    return jdbc.sql(SELECT + " WHERE p.id=:id").param("id", id).query(Post.class).optional();
  }

  public long insert(long authorId, String title, String body) {
    var key = new GeneratedKeyHolder();
    jdbc.sql("INSERT INTO posts(author_id,title,body) VALUES (:author,:title,:body)")
        .param("author", authorId)
        .param("title", title)
        .param("body", body)
        .update(key, "id");
    return key.getKey().longValue();
  }

  public int update(long id, long authorId, String title, String body) {
    return jdbc.sql("UPDATE posts SET title=:title, body=:body WHERE id=:id AND author_id=:author")
        .param("id", id)
        .param("author", authorId)
        .param("title", title)
        .param("body", body)
        .update();
  }

  public int delete(long id, long authorId) {
    return jdbc.sql("DELETE FROM posts WHERE id=:id AND author_id=:author")
        .param("id", id)
        .param("author", authorId)
        .update();
  }
}
