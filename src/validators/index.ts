import { TSingleValidatorResponse, TValidationOptions, TValidationResponse } from "src/types/validators";

export abstract class Validator {
  abstract validate(value: any, additionalProps?: Object): TSingleValidatorResponse;
}

export const validate = <T>(values: T, validators: TValidationOptions): TValidationResponse => {
  const errors = {};
  validators.forEach((field) => {
    field.validators.forEach((validator) => {
      const result = validator.validate(values[field.field], field.additionalProps);
      if (!result.isValid) {
        errors[field.field] = field.message || result.message;
      }
    });
  });

  return errors;
};
