package com.example.board.post;

import com.example.board.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {
  public record PostInput(
      @NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 10000) String body) {}

  private final PostService posts;
  private final CurrentUser currentUser;

  public PostController(PostService posts, CurrentUser currentUser) {
    this.posts = posts;
    this.currentUser = currentUser;
  }

  @GetMapping
  List<Post> list() {
    return posts.list();
  }

  @GetMapping("/{id}")
  Post detail(@PathVariable long id) {
    return posts.find(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  Post create(@Valid @RequestBody PostInput input, HttpServletRequest request) {
    return posts.create(currentUser.requireId(request), input.title(), input.body());
  }

  @PutMapping("/{id}")
  Post update(
      @PathVariable long id, @Valid @RequestBody PostInput input, HttpServletRequest request) {
    return posts.update(id, currentUser.requireId(request), input.title(), input.body());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable long id, HttpServletRequest request) {
    posts.delete(id, currentUser.requireId(request));
  }
}
