export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label: string;
  let color: string;
  if (score <= 1) {
    label = 'Muito fraca';
    color = 'var(--error)';
  } else if (score === 2) {
    label = 'Fraca';
    color = 'var(--error)';
  } else if (score === 3) {
    label = 'Média';
    color = '#f59e0b';
  } else if (score === 4) {
    label = 'Forte';
    color = 'var(--success, #10b981)';
  } else {
    label = 'Muito forte';
    color = 'var(--success, #10b981)';
  }

  return {
    score,
    label,
    color,
    requirements: {
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
    },
  };
}