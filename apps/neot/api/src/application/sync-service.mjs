export class NeotSyncService {
  constructor(repository, cloudClient, eventBus) {
    this.repository = repository;
    this.cloudClient = cloudClient;
    this.eventBus = eventBus;
  }

  async getStatus() {
    return this.repository.getSyncStatus();
  }

  async checkCloudHealth() {
    try {
      const result = await this.cloudClient.checkHealth();
      await this.repository.updateSyncStatus({
        lastVerifiedAt: new Date().toISOString(),
        lastError: result.ok ? null : result.message,
        status: result.ok ? 'ready' : 'error',
      });
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.repository.updateSyncStatus({
        lastVerifiedAt: new Date().toISOString(),
        lastError: errorMsg,
        status: 'error',
      });
      return { ok: false, message: errorMsg };
    }
  }

  async pullFromCloud(token) {
    const now = new Date().toISOString();
    try {
      await this.repository.updateSyncStatus({ status: 'syncing' });
      const remoteSnapshot = await this.cloudClient.fetchRemoteSnapshot(token);
      const importResult = await this.repository.importSnapshot(remoteSnapshot);

      await this.repository.updateSyncStatus({
        status: 'ready',
        lastPulledAt: now,
        lastError: null,
      });

      if (this.eventBus) {
        await this.eventBus.publish({
          eventId: remoteSnapshot.instanceId,
          eventType: 'SyncCompleted',
          occurredAt: now,
          payload: { direction: 'pull', recordCount: importResult.recordsImported, timestamp: now },
        });
      }

      return {
        direction: 'pull',
        recordsProcessed: importResult.recordsImported,
        synchronizedAt: now,
        success: true,
        message: `Successfully pulled and imported ${importResult.recordsImported} records from cloud.`,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.repository.updateSyncStatus({
        status: 'error',
        lastError: errorMsg,
      });
      return {
        direction: 'pull',
        recordsProcessed: 0,
        synchronizedAt: now,
        success: false,
        message: `Pull failed: ${errorMsg}`,
      };
    }
  }

  async pushToCloud(token) {
    const now = new Date().toISOString();
    try {
      await this.repository.updateSyncStatus({ status: 'syncing' });
      const localSnapshot = await this.repository.exportSnapshot();
      const pushResult = await this.cloudClient.publishLocalSnapshot(localSnapshot, token);

      let recordCount = 0;
      for (const list of Object.values(localSnapshot.tables)) {
        recordCount += list.length;
      }

      await this.repository.updateSyncStatus({
        status: 'ready',
        lastPublishedAt: now,
        remoteRevision: pushResult.revision,
        lastError: null,
      });

      if (this.eventBus) {
        await this.eventBus.publish({
          eventId: localSnapshot.instanceId,
          eventType: 'SyncCompleted',
          occurredAt: now,
          payload: { direction: 'push', recordCount, timestamp: now },
        });
      }

      return {
        direction: 'push',
        recordsProcessed: recordCount,
        synchronizedAt: now,
        success: true,
        message: `Successfully published ${recordCount} records to cloud (Revision ${pushResult.revision}).`,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.repository.updateSyncStatus({
        status: 'error',
        lastError: errorMsg,
      });
      return {
        direction: 'push',
        recordsProcessed: 0,
        synchronizedAt: now,
        success: false,
        message: `Push failed: ${errorMsg}`,
      };
    }
  }
}
