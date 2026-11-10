import { describe, expect, it, vi } from 'vitest';
import { authService } from '../services';
import { useAuthStore } from '../stores/authStore';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';

describe('Logging out', () => {
  it('signs her out on this device even when the server cannot be reached', async () => {
    const { user, tokens } = await authService.login({ email: 'amina@healthlink.demo', password: DEMO_PASSWORD });
    await useAuthStore.getState().setSession({ user, tokens });
    expect(useAuthStore.getState().user).not.toBeNull();

    const offline = vi.spyOn(authService, 'logout').mockRejectedValue({ code: 'NETWORK', message: 'offline' });
    await useAuthStore.getState().logout();

    expect(offline).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().tokens).toBeNull();
    offline.mockRestore();
  });
});
