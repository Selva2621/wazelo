import { NotFoundException } from '@nestjs/common';
import { BulkContactsUseCase } from './bulk-contacts.use-case';

const meta = { orgId: 'org-1', userId: 'user-1', ipAddress: '127.0.0.1', userAgent: 'jest' };

function setup() {
  const changeStatus = { execute: jest.fn(async () => ({})) };
  const assign = { execute: jest.fn(async () => ({})) };
  const addTag = { execute: jest.fn(async () => ({})) };
  const del = { execute: jest.fn(async () => ({ success: true })) };
  const useCase = new BulkContactsUseCase(
    changeStatus as any,
    assign as any,
    addTag as any,
    del as any,
  );
  return { useCase, changeStatus, assign, addTag, del };
}

describe('BulkContactsUseCase', () => {
  it('runs the single-contact use case for every id with the caller org and user', async () => {
    const { useCase, changeStatus } = setup();

    const result = await useCase.changeStatus(
      { contactIds: ['c1', 'c2'], status: 'CONTACTED' as any, reason: 'call' },
      meta,
    );

    expect(result).toEqual({ succeeded: ['c1', 'c2'], failed: [] });
    expect(changeStatus.execute).toHaveBeenNthCalledWith(
      1, 'c1', 'org-1', 'user-1', { status: 'CONTACTED', reason: 'call' }, '127.0.0.1', 'jest',
    );
    expect(changeStatus.execute).toHaveBeenNthCalledWith(
      2, 'c2', 'org-1', 'user-1', { status: 'CONTACTED', reason: 'call' }, '127.0.0.1', 'jest',
    );
  });

  it('keeps going when one contact fails and reports it', async () => {
    const { useCase, del } = setup();
    del.execute.mockImplementationOnce(async () => ({ success: true }))
      .mockImplementationOnce(async () => { throw new NotFoundException('Contact not found'); })
      .mockImplementationOnce(async () => ({ success: true }));

    const result = await useCase.delete({ contactIds: ['a', 'b', 'c'] }, meta);

    expect(result.succeeded).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ contactId: 'b', error: 'Contact not found' }]);
    expect(del.execute).toHaveBeenCalledTimes(3);
  });

  it('passes owner and tag payloads through unchanged', async () => {
    const { useCase, assign, addTag } = setup();

    await useCase.assign({ contactIds: ['c1'], ownerId: 'owner-9' }, meta);
    await useCase.addTag({ contactIds: ['c1'], name: 'vip', color: '#FF5733' }, meta);

    expect(assign.execute).toHaveBeenCalledWith(
      'c1', 'org-1', 'user-1', { ownerId: 'owner-9', reason: undefined }, '127.0.0.1', 'jest',
    );
    expect(addTag.execute).toHaveBeenCalledWith(
      'c1', 'org-1', 'user-1', { name: 'vip', color: '#FF5733' }, '127.0.0.1', 'jest',
    );
  });
});
