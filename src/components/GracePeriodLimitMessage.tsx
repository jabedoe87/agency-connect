import useMessageLimit from '@/hooks/useMessageLimit';

export default function GracePeriodLimitMessage() {
  const { isDailyLimitReached, isInGracePeriod, isPaidUser, FREE_DAILY_LIMIT } = useMessageLimit();

  if (isPaidUser) return null;
  if (!isDailyLimitReached || !isInGracePeriod) return null;

  return (
    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mx-4 mt-2 text-center">
      <span className="text-sm font-medium">
        You're on fire! Come back tomorrow for {FREE_DAILY_LIMIT} more free messages.
      </span>
    </div>
  );
}
