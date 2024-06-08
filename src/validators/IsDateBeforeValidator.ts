import { TSingleValidatorResponse } from 'src/types/validators';
import { Validator } from '.';

interface IAdditionalProps {
  comparedDate: Date;
}

class RequiredValidator extends Validator {
  validate(value: Date, { comparedDate }: IAdditionalProps): TSingleValidatorResponse {
    return {
      isValid: value.getTime() < comparedDate.getTime(),
      message: 'expired',
    };
  }
}

export default new RequiredValidator();
