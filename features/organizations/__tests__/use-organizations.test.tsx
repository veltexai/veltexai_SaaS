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
  it("serializes B then C and finishes with authoritative state equal to the UI", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    let authoritative = "org-a";
    const gates = [first, second];
    const setActiveOrganizationId = jest.fn(async (target: string) => {
      const gate = gates.shift();
      await gate?.promise;
      authoritative = target;
    });
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));

    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    expect(setActiveOrganizationId).toHaveBeenCalledTimes(1);
    await act(async () => first.resolve());
    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalledTimes(2));
    expect(authoritative).toBe("org-b");
    expect(result.current.activeOrganizationId).toBe("org-b");
    await act(async () => second.resolve());
    expect(result.current.activeOrganizationId).toBe("org-c");
    expect(authoritative).toBe(result.current.activeOrganizationId);
    expect(result.current.switchError).toBeNull();
  });

  it("continues to the queued latest intent after the earlier write fails", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    let authoritative = "org-a";
    const setActiveOrganizationId = jest
      .fn(async (target: string) => {
        if (target === "org-b") await first.promise;
        else await second.promise;
        authoritative = target;
      });
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));

    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    await act(async () => first.reject(new Error("stale failure")));
    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalledTimes(2));
    await act(async () => second.resolve());
    expect(result.current.activeOrganizationId).toBe("org-c");
    expect(authoritative).toBe(result.current.activeOrganizationId);
    expect(result.current.switchError).toBeNull();
  });

  it("rolls back to the earlier authoritative success when the later write fails", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    let authoritative = "org-a";
    const setActiveOrganizationId = jest.fn(async (target: string) => {
      if (target === "org-b") await first.promise;
      else await second.promise;
      authoritative = target;
    });
    const subject = adapter({ setActiveOrganizationId });
    const { result } = renderHook(() => useOrganizations(subject));
    await waitFor(() => expect(result.current.activeOrganizationId).toBe("org-a"));
    act(() => {
      result.current.setActiveOrganizationId("org-b");
      result.current.setActiveOrganizationId("org-c");
    });
    await act(async () => first.resolve());
    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalledTimes(2));
    expect(result.current.activeOrganizationId).toBe("org-b");
    await act(async () => second.reject(new Error("latest failure")));
    expect(result.current.activeOrganizationId).toBe("org-b");
    expect(authoritative).toBe(result.current.activeOrganizationId);
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
