export function shouldBeginAutoAdvance(args: {
  enabled: boolean;
  locked: boolean;
  alreadyStarted: boolean;
  checked: boolean;
  formValid: boolean;
}) {
  return (
    args.enabled &&
    !args.locked &&
    !args.alreadyStarted &&
    args.checked &&
    args.formValid
  );
}
