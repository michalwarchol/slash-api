import { TSingleValidatorResponse } from 'src/types/validators';
import { Validator } from '.';

class RequiredValidator extends Validator {
  validate(value: any): TSingleValidatorResponse {
    return {
      isValid: value !== '' && value !== undefined && value !== null,
      message: 'Field is required.',
    };
  }
}

export default new RequiredValidator();
