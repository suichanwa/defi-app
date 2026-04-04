import {
  validatePassword,
  validatePasswordMatch,
  meetsMinimumRequirements,
  isPasswordStrong,
  getPasswordStrength,
} from '../src/utils/passwordValidation';

describe('validatePassword', () => {
  it('returns null for a valid strong password', () => {
    expect(validatePassword('StrongPass1!')).toBeNull();
  });

  it('returns an error for a password shorter than 8 characters', () => {
    expect(validatePassword('Abc1!')).toBe('Password must be at least 8 characters');
  });

  it('returns an error for a too-weak password', () => {
    expect(validatePassword('aaaaaaaa')).toBe(
      'Password is too weak. Use a mix of letters, numbers, and symbols',
    );
  });
});

describe('validatePasswordMatch', () => {
  it('returns null when passwords match', () => {
    expect(validatePasswordMatch('MyPass1!', 'MyPass1!')).toBeNull();
  });

  it('returns an error when passwords do not match', () => {
    expect(validatePasswordMatch('MyPass1!', 'Different1!')).toBe('Passwords do not match');
  });
});

describe('meetsMinimumRequirements', () => {
  it('returns true for a password of exactly 8 characters', () => {
    expect(meetsMinimumRequirements('12345678')).toBe(true);
  });

  it('returns true for a password longer than 8 characters', () => {
    expect(meetsMinimumRequirements('StrongPass1!')).toBe(true);
  });

  it('returns false for a password shorter than 8 characters', () => {
    expect(meetsMinimumRequirements('1234567')).toBe(false);
  });
});

describe('isPasswordStrong', () => {
  it('returns true for a strong password', () => {
    expect(isPasswordStrong('StrongPass1!')).toBe(true);
  });

  it('returns false for a weak all-lowercase password', () => {
    expect(isPasswordStrong('aaaaaaaa')).toBe(false);
  });
});

describe('getPasswordStrength', () => {
  it('returns a strength object with an id property', () => {
    const result = getPasswordStrength('StrongPass1!');
    expect(result).toHaveProperty('id');
    expect(typeof result.id).toBe('number');
  });

  it('gives a higher strength id to a complex password than to a simple one', () => {
    const weak = getPasswordStrength('aaaaaaaa');
    const strong = getPasswordStrength('StrongPass1!');
    expect(strong.id).toBeGreaterThan(weak.id);
  });
});
