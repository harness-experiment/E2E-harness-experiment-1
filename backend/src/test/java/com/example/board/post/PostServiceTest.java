package com.example.board.post;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.board.shared.ApiException;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PostServiceTest {
  private final PostRepository repository = mock(PostRepository.class);
  private final PostService service = new PostService(repository);
  private final Post post =
      new Post(1, 10, "a@example.test", "title", "body", OffsetDateTime.now());

  @Test
  void nonAuthorCannotWrite() {
    when(repository.find(1)).thenReturn(Optional.of(post));
    var error = assertThrows(ApiException.class, () -> service.update(1, 20, "changed", "body"));
    assertEquals(HttpStatus.FORBIDDEN, error.status());
    verify(repository, never()).update(anyLong(), anyLong(), anyString(), anyString());
  }

  @Test
  void missingPostCannotBeDeleted() {
    when(repository.find(1)).thenReturn(Optional.empty());
    var error = assertThrows(ApiException.class, () -> service.delete(1, 10));
    assertEquals(HttpStatus.NOT_FOUND, error.status());
    verify(repository, never()).delete(anyLong(), anyLong());
  }

  @Test
  void concurrentDeletionDoesNotReportSuccessfulUpdate() {
    when(repository.find(1)).thenReturn(Optional.of(post));
    when(repository.update(1, 10, "new", "body")).thenReturn(0);
    var error = assertThrows(ApiException.class, () -> service.update(1, 10, "new", "body"));
    assertEquals(HttpStatus.NOT_FOUND, error.status());
  }
}
