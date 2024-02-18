import { TSingleValidatorResponse } from 'src/types/validators';
import { Validator } from '.';

class IsEmailValidator extends Validator {
  validate(value: string): TSingleValidatorResponse {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; 

    return {
      isValid: emailRegex.test(value),
      message: 'It is not a valid email.',
    };
  }
}

export default new IsEmailValidator();