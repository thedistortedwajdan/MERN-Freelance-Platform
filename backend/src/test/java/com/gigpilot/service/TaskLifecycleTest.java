package com.gigpilot.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gigpilot.dto.Dtos.CancelRequest;
import com.gigpilot.dto.Dtos.RevisionRequest;
import com.gigpilot.dto.Dtos.SubmitRequest;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.repository.FavoriteRepository;
import com.gigpilot.repository.ProposalRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;

/** The delivery/review state machine, tested without a database. */
@ExtendWith(MockitoExtension.class)
class TaskLifecycleTest {
    private static final AuthUser EMPLOYER = new AuthUser("e1", Role.employer);
    private static final AuthUser FREELANCER = new AuthUser("f1", Role.freelancer);
    private static final AuthUser STRANGER = new AuthUser("x1", Role.freelancer);

    @Mock TaskRepository tasks;
    @Mock UserRepository users;
    @Mock ProposalRepository proposals;
    @Mock FavoriteRepository favorites;
    @Mock MongoTemplate mongo;
    @Mock ViewMapper mapper;
    @Mock TaskLookup lookup;
    @Mock FileService files;
    @Mock NotificationService notifications;
    @Mock ProposalMaintenance proposalMaintenance;
    @Mock BlockService blocks;
    @Mock AuditService audit;
    @InjectMocks TaskService service;

    private Task task;

    @BeforeEach
    void setUp() {
        task = new Task();
        task.setId("t1");
        task.setTitle("Fix my fence");
        task.setEmployer("e1");
        task.setFreelancer("f1");
        when(lookup.require("t1")).thenReturn(task);
    }

    private static int statusOf(ApiException e) {
        return e.getStatus().value();
    }

    @Test
    void submitMovesAssignedTaskToSubmittedAndNotifiesTheEmployer() {
        task.setStatus(TaskStatus.assigned);
        when(files.claim("f1", null)).thenReturn(List.of());

        service.submit(FREELANCER, "t1", new SubmitRequest("all done", null));

        assertEquals(TaskStatus.submitted, task.getStatus());
        assertEquals("all done", task.getSubmissionNote());
        verify(tasks).save(task);
        verify(notifications).notify(eq("e1"), eq(NotificationType.task_submitted), anyString(), eq("t1"));
    }

    @Test
    void onlyTheAssigneeCanSubmit() {
        task.setStatus(TaskStatus.assigned);
        ApiException e = assertThrows(ApiException.class, () -> service.submit(STRANGER, "t1", null));
        assertEquals(HttpStatus.FORBIDDEN.value(), statusOf(e));
        verify(tasks, never()).save(task);
    }

    @Test
    void cannotSubmitTwice() {
        task.setStatus(TaskStatus.submitted);
        ApiException e = assertThrows(ApiException.class, () -> service.submit(FREELANCER, "t1", null));
        assertEquals(HttpStatus.BAD_REQUEST.value(), statusOf(e));
    }

    @Test
    void approveCompletesSubmittedWork() {
        task.setStatus(TaskStatus.submitted);

        service.approve(EMPLOYER, "t1");

        assertEquals(TaskStatus.completed, task.getStatus());
        verify(notifications).notify(eq("f1"), eq(NotificationType.task_completed), anyString(), eq("t1"));
    }

    @Test
    void approveRejectsWorkThatWasNeverSubmitted() {
        task.setStatus(TaskStatus.assigned);
        ApiException e = assertThrows(ApiException.class, () -> service.approve(EMPLOYER, "t1"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), statusOf(e));
        assertEquals(TaskStatus.assigned, task.getStatus());
    }

    @Test
    void onlyTheEmployerCanApprove() {
        task.setStatus(TaskStatus.submitted);
        ApiException e = assertThrows(ApiException.class, () -> service.approve(FREELANCER, "t1"));
        assertEquals(HttpStatus.FORBIDDEN.value(), statusOf(e));
    }

    @Test
    void revisionSendsWorkBackWithANote() {
        task.setStatus(TaskStatus.submitted);

        service.requestRevision(EMPLOYER, "t1", new RevisionRequest("  paint the gate too "));

        assertEquals(TaskStatus.assigned, task.getStatus());
        assertEquals("paint the gate too", task.getRevisionNote());
        verify(notifications).notify(eq("f1"), eq(NotificationType.revision_requested), anyString(), eq("t1"));
    }

    @Test
    void cancelWorksOnActiveTasksAndRecordsTheReason() {
        task.setStatus(TaskStatus.assigned);

        service.cancel(EMPLOYER, "t1", new CancelRequest(" changed my mind "));

        assertEquals(TaskStatus.cancelled, task.getStatus());
        assertEquals("changed my mind", task.getCancelReason());
        verify(notifications).notify(eq("f1"), eq(NotificationType.task_cancelled), anyString(), eq("t1"));
    }

    @Test
    void completedTasksCannotBeCancelled() {
        task.setStatus(TaskStatus.completed);
        ApiException e = assertThrows(ApiException.class, () -> service.cancel(EMPLOYER, "t1", null));
        assertEquals(HttpStatus.BAD_REQUEST.value(), statusOf(e));
    }

    @Test
    void withdrawReopensTheTaskAndClearsTheAssignee() {
        task.setStatus(TaskStatus.assigned);
        task.setAgreedPrice(50.0);

        service.withdraw(FREELANCER, "t1");

        assertEquals(TaskStatus.open, task.getStatus());
        assertEquals(null, task.getFreelancer());
        assertEquals(null, task.getAgreedPrice());
        verify(proposalMaintenance).withdrawAccepted("t1", "f1");
        verify(notifications).notify(eq("e1"), eq(NotificationType.task_withdrawn), anyString(), eq("t1"));
    }

    @Test
    void onlyOpenTasksCanBeEditedOrDeleted() {
        task.setStatus(TaskStatus.assigned);
        ApiException e = assertThrows(ApiException.class, () -> service.delete(EMPLOYER, "t1"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), statusOf(e));
        verify(tasks, never()).delete(task);
    }
}
