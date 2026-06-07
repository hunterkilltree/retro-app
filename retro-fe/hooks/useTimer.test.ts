import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { formatTime, useTimer } from "./useTimer";

describe("formatTime", () => {
  it("formats seconds as M:SS with zero-padding", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(600)).toBe("10:00");
  });
});

describe("useTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 0 when the deadline is null", () => {
    const { result } = renderHook(() => useTimer(null));
    expect(result.current).toBe(0);
  });

  it("counts down floored remaining seconds toward the deadline", () => {
    const now = 1_000_000;
    vi.setSystemTime(now);
    const { result } = renderHook(() => useTimer(now + 10_000));
    expect(result.current).toBe(10);
    // advanceTimersByTime also advances the mocked clock; tick fires each second.
    act(() => vi.advanceTimersByTime(4_000));
    expect(result.current).toBe(6);
  });

  it("invokes onExpire exactly once when it hits zero", () => {
    const now = 2_000_000;
    vi.setSystemTime(now);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useTimer(now + 2_000, onExpire));
    expect(result.current).toBe(2);
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
    // Further ticks past zero must not re-fire the callback.
    act(() => vi.advanceTimersByTime(3_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
