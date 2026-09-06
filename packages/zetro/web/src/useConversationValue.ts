import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

export type ConversationValue<T> = {
  value: T;
  values: Readonly<Record<string, T>>;
  setCurrent: Dispatch<SetStateAction<T>>;
  setFor: (conversationId: string, value: SetStateAction<T>) => void;
  remove: (conversationId: string) => void;
};

export function useConversationValue<T>(activeId: string, createInitialValue: () => T): ConversationValue<T> {
  const [values, setValues] = useState<Record<string, T>>(() => ({ [activeId]: createInitialValue() }));
  const fallback = useMemo(createInitialValue, [activeId]);
  const value = Object.hasOwn(values, activeId) ? values[activeId]! : fallback;

  const setFor = useCallback((conversationId: string, action: SetStateAction<T>) => {
    setValues((current) => {
      const previous = Object.hasOwn(current, conversationId) ? current[conversationId]! : createInitialValue();
      const next = typeof action === "function" ? (action as (value: T) => T)(previous) : action;
      return { ...current, [conversationId]: next };
    });
  }, [createInitialValue]);

  const setCurrent = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setFor(activeId, action);
  }, [activeId, setFor]);

  const remove = useCallback((conversationId: string) => {
    setValues((current) => {
      const { [conversationId]: _removed, ...remaining } = current;
      return remaining;
    });
  }, []);

  return { value, values, setCurrent, setFor, remove };
}
