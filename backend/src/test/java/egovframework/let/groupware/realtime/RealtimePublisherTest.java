package egovframework.let.groupware.realtime;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class RealtimePublisherTest {

    private final RealtimeStreamService streams = mock(RealtimeStreamService.class);
    private final RealtimePublisher publisher = new RealtimePublisher(streams);
    private final TransactionTemplate transaction = new TransactionTemplate(new AbstractPlatformTransactionManager() {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object tx, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
    });

    @Test
    void sendsOnlyAfterSuccessfulCommit() {
        transaction.execute(status -> {
            publisher.publish(4L, 12L, RealtimeArea.NOTIFICATION);
            verifyNoInteractions(streams);
            return null;
        });
        verify(streams).publish(4L, 12L, RealtimeArea.NOTIFICATION);
    }

    @Test
    void rollbackDoesNotSend() {
        transaction.execute(status -> {
            publisher.publish(4L, 12L, RealtimeArea.MESSAGE);
            status.setRollbackOnly();
            return null;
        });
        verifyNoInteractions(streams);
    }

    @Test
    void missingOrReadOnlyTransactionDoesNotSend() {
        publisher.publish(4L, 12L, RealtimeArea.MESSAGE);
        transaction.setReadOnly(true);
        transaction.execute(status -> {
            publisher.publish(4L, 12L, RealtimeArea.MESSAGE);
            return null;
        });
        verifyNoInteractions(streams);
    }

    @Test
    void deliveryFailureDoesNotFailCommittedBusiness() {
        doThrow(new IllegalStateException("disconnected")).when(streams)
                .publish(4L, 12L, RealtimeArea.MESSAGE);
        transaction.execute(status -> {
            publisher.publish(4L, 12L, RealtimeArea.MESSAGE);
            return null;
        });
        verify(streams).publish(4L, 12L, RealtimeArea.MESSAGE);
    }
}
