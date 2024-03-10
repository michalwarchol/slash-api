import { TSingleValidatorResponse } from 'src/types/validators';
import { Validator } from '.';

class PasswordValidator extends Validator {
  validate(value: string): TSingleValidatorResponse {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/; // at least 6 characters, at least 1 big and 1 small letter, at least 1 number

    return {
      isValid: passwordRegex.test(value),
      message:
        'validPassword',
    };
  }
}

export default new PasswordValidator();
