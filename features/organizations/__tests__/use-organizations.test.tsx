/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrganizations } from "../hooks/use-organizations";
import type { TeamAdapter } from "../types/organization";

const organizations = [
  { id: "org-a", name: "A", slug: "a" },
  { id: "org-b", name: "B", slug: "b" },
  { id: "org-c", name: "C", slug: "c" },
];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function adapter(overrides: Partial<TeamAdapter> = {}): TeamAdapter {
  return {
    listOrganizations: async () => organizations,
    getActiveOrganizationId: async () => "org-a",
    setActiveOrganizationId: async () => undefined,
    listMembers: async () => [],
    getCapabilities: async () => ({ invitationsEnabled: false, contactDetailsEnabled: false }),
    inviteMember: async () => { throw new Error("disabled"); },
    ...overrides,
  };
}

describe("useOrganizations persistence ordering", () => {
  it("ignores an earlier success that settles after a later success", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const setActiveOrganizationId = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));

    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    await act(async () => second.resolve());
    expect(result.current.activeOrganizationId).toBe("org-c");
    await act(async () => first.resolve());
    expect(result.current.activeOrganizationId).toBe("org-c");
    expect(result.current.switchError).toBeNull();
  });

  it("ignores an earlier failure that settles after a later success", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const setActiveOrganizationId = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));

    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    await act(async () => second.resolve());
    await act(async () => first.reject(new Error("stale failure")));
    expect(result.current.activeOrganizationId).toBe("org-c");
    expect(result.current.switchError).toBeNull();
  });

  it("keeps the persisted selection when the earlier request settles before the later failure", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const setActiveOrganizationId = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));
    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    await act(async () => first.resolve());
    expect(result.current.activeOrganizationId).toBe("org-a");
    await act(async () => second.reject(new Error("latest failure")));
    expect(result.current.activeOrganizationId).toBe("org-a");
    expect(result.current.switchError).toBe("latest failure");
  });

  it.each([null, "stale-org"])(
    "persists the first validated organization when the stored id is %s",
    async (persistedId) => {
      const setActiveOrganizationId = jest.fn().mockResolvedValue(undefined);
      const subject = adapter({
        getActiveOrganizationId: async () => persistedId,
        setActiveOrganizationId,
      });
      const { result } = renderHook(() => useOrganizations(subject));
      await waitFor(() => expect(result.current.status).toBe("success"));
      expect(setActiveOrganizationId).toHaveBeenCalledWith("org-a");
      expect(result.current.activeOrganizationId).toBe("org-a");
    },
  );

  it("does not display a local fallback when bootstrap persistence fails", async () => {
    const setActiveOrganizationId = jest.fn().mockRejectedValue(new Error("write failed"));
    const subject = adapter({
      getActiveOrganizationId: async () => null,
      setActiveOrganizationId,
    });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.activeOrganizationId).toBeNull();
    expect(result.current.switchError).toBe("write failed");
    act(() => result.current.retryFailedSwitch());
    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalledTimes(2));
  });
});
