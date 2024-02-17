import { Validator } from 'src/validators';

export type TSingleValidatorResponse = {
  isValid: boolean;
  message: string;
};

export type TValidationOptions = Array<{
  field: string;
  value: any;
  validators: Array<Validator>;
  message?: string;
  additionalProps?: Object;
}>;

export type TValidationResponse = {
  [key: string]: string;
};
