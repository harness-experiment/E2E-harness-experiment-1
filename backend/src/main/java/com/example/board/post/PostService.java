package com.example.board.post;

import com.example.board.shared.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {
  private final PostRepository posts;

  public PostService(PostRepository posts) {
    this.posts = posts;
  }

  public List<Post> list() {
    return posts.list();
  }

  public Post find(long id) {
    return posts
        .find(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다."));
  }

  @Transactional
  public Post create(long authorId, String title, String body) {
    return find(posts.insert(authorId, title, body));
  }

  @Transactional
  public Post update(long id, long userId, String title, String body) {
    requireAuthor(find(id), userId);
    if (posts.update(id, userId, title, body) == 0) {
      throw new ApiException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
    }
    return find(id);
  }

  @Transactional
  public void delete(long id, long userId) {
    requireAuthor(find(id), userId);
    posts.delete(id, userId);
  }

  static void requireAuthor(Post post, long userId) {
    if (post.authorId() != userId) {
      throw new ApiException(HttpStatus.FORBIDDEN, "작성자만 변경할 수 있습니다.");
    }
  }
}
