/**
 * Elite Form Validation System with Ihsān Principles
 * 
 * Comprehensive validation featuring:
 * - Schema-based validation
 * - Async validation support
 * - Custom validator functions
 * - Field-level and form-level validation
 * - Internationalized error messages
 * - Type-safe validation results
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  params?: Record<string, unknown>;
}

export type ValidatorFn<T = unknown> = (
  value: T,
  context?: ValidationContext
) => ValidationError | null | Promise<ValidationError | null>;

export interface ValidationContext {
  field: string;
  formData: Record<string, unknown>;
  touched: Set<string>;
  dirty: Set<string>;
}

export interface FieldSchema<T = unknown> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: T[];
  custom?: ValidatorFn<T>[];
  async?: ValidatorFn<T>[];
  messages?: Partial<Record<string, string>>;
  transform?: (value: T) => T;
}

export type FormSchema<T extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof T]?: FieldSchema<T[K]>;
};

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Record<keyof T, ValidationError[]>;
  touched: Set<keyof T>;
  dirty: Set<keyof T>;
  isValid: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

// ============================================================================
// Error Messages
// ============================================================================

const defaultMessages: Record<string, string> = {
  required: 'This field is required',
  type_string: 'Must be a string',
  type_number: 'Must be a number',
  type_boolean: 'Must be true or false',
  type_array: 'Must be an array',
  type_object: 'Must be an object',
  type_date: 'Must be a valid date',
  type_email: 'Must be a valid email address',
  type_url: 'Must be a valid URL',
  min: 'Must be at least {{min}}',
  max: 'Must be at most {{max}}',
  minLength: 'Must be at least {{minLength}} characters',
  maxLength: 'Must be no more than {{maxLength}} characters',
  pattern: 'Invalid format',
  enum: 'Must be one of: {{values}}'
};

function formatMessage(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => 
    String(params[key] ?? `{{${key}}}`)
  );
}

// ============================================================================
// Built-in Validators
// ============================================================================

export const validators = {
  required: <T>(message?: string): ValidatorFn<T> => (value, context) => {
    const isEmpty = value === undefined || value === null || value === '' ||
      (Array.isArray(value) && value.length === 0);
    
    if (isEmpty) {
      return {
        field: context?.field || '',
        message: message || defaultMessages.required,
        code: 'required'
      };
    }
    return null;
  },

  type: <T>(type: FieldSchema['type'], message?: string): ValidatorFn<T> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    let isValid = false;
    
    switch (type) {
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'object':
        isValid = typeof value === 'object' && !Array.isArray(value);
        break;
      case 'date':
        isValid = value instanceof Date && !isNaN(value.getTime());
        break;
      case 'email':
        isValid = typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'url':
        isValid = typeof value === 'string' && /^https?:\/\/.+/.test(value);
        break;
    }
    
    if (!isValid) {
      return {
        field: context?.field || '',
        message: message || defaultMessages[`type_${type}`] || `Invalid type: expected ${type}`,
        code: `type_${type}`
      };
    }
    return null;
  },

  min: (min: number, message?: string): ValidatorFn<number> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    if (typeof value === 'number' && value < min) {
      return {
        field: context?.field || '',
        message: message || formatMessage(defaultMessages.min, { min }),
        code: 'min',
        params: { min }
      };
    }
    return null;
  },

  max: (max: number, message?: string): ValidatorFn<number> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    if (typeof value === 'number' && value > max) {
      return {
        field: context?.field || '',
        message: message || formatMessage(defaultMessages.max, { max }),
        code: 'max',
        params: { max }
      };
    }
    return null;
  },

  minLength: (minLength: number, message?: string): ValidatorFn<string | unknown[]> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
    
    if (length < minLength) {
      return {
        field: context?.field || '',
        message: message || formatMessage(defaultMessages.minLength, { minLength }),
        code: 'minLength',
        params: { minLength }
      };
    }
    return null;
  },

  maxLength: (maxLength: number, message?: string): ValidatorFn<string | unknown[]> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
    
    if (length > maxLength) {
      return {
        field: context?.field || '',
        message: message || formatMessage(defaultMessages.maxLength, { maxLength }),
        code: 'maxLength',
        params: { maxLength }
      };
    }
    return null;
  },

  pattern: (pattern: RegExp, message?: string): ValidatorFn<string> => (value, context) => {
    if (value === undefined || value === null || value === '') return null;
    
    if (typeof value === 'string' && !pattern.test(value)) {
      return {
        field: context?.field || '',
        message: message || defaultMessages.pattern,
        code: 'pattern',
        params: { pattern: pattern.toString() }
      };
    }
    return null;
  },

  enum: <T>(values: T[], message?: string): ValidatorFn<T> => (value, context) => {
    if (value === undefined || value === null) return null;
    
    if (!values.includes(value)) {
      return {
        field: context?.field || '',
        message: message || formatMessage(defaultMessages.enum, { values: values.join(', ') }),
        code: 'enum',
        params: { values }
      };
    }
    return null;
  },

  // Common patterns
  email: (message?: string): ValidatorFn<string> => 
    validators.type('email', message || defaultMessages.type_email),

  url: (message?: string): ValidatorFn<string> => 
    validators.type('url', message || defaultMessages.type_url),

  phone: (message?: string): ValidatorFn<string> => 
    validators.pattern(/^\+?[\d\s-()]+$/, message || 'Invalid phone number'),

  alphanumeric: (message?: string): ValidatorFn<string> => 
    validators.pattern(/^[a-zA-Z0-9]+$/, message || 'Must contain only letters and numbers'),

  noWhitespace: (message?: string): ValidatorFn<string> => 
    validators.pattern(/^\S+$/, message || 'Must not contain whitespace'),

  // Async validators
  async: {
    unique: <T>(
      checkFn: (value: T) => Promise<boolean>,
      message?: string
    ): ValidatorFn<T> => async (value, context) => {
      if (value === undefined || value === null || value === '') return null;
      
      const isUnique = await checkFn(value);
      if (!isUnique) {
        return {
          field: context?.field || '',
          message: message || 'This value is already taken',
          code: 'unique'
        };
      }
      return null;
    },

    debounced: <T>(
      validator: ValidatorFn<T>,
      delay: number = 300
    ): ValidatorFn<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      return (value, context) => {
        return new Promise((resolve) => {
          if (timeoutId) clearTimeout(timeoutId);
          
          timeoutId = setTimeout(async () => {
            const result = await validator(value, context);
            resolve(result);
          }, delay);
        });
      };
    }
  }
};

// ============================================================================
// Schema Validator
// ============================================================================

export class SchemaValidator<T extends Record<string, unknown>> {
  private schema: FormSchema<T>;
  private customMessages: Record<string, string>;
  
  constructor(schema: FormSchema<T>, customMessages: Record<string, string> = {}) {
    this.schema = schema;
    this.customMessages = customMessages;
  }
  
  /**
   * Validate a single field
   */
  async validateField(
    field: keyof T,
    value: unknown,
    formData: T
  ): Promise<ValidationError[]> {
    const fieldSchema = this.schema[field];
    if (!fieldSchema) return [];
    
    const errors: ValidationError[] = [];
    const context: ValidationContext = {
      field: field as string,
      formData,
      touched: new Set(),
      dirty: new Set()
    };
    
    // Transform value if needed
    const transformedValue = fieldSchema.transform 
      ? fieldSchema.transform(value as never)
      : value;
    
    // Required validation
    if (fieldSchema.required) {
      const error = await Promise.resolve(validators.required(
        fieldSchema.messages?.required || this.customMessages.required
      )(transformedValue, context));
      if (error) {
        errors.push(error);
        return errors; // Stop if required fails
      }
    }
    
    // Skip other validations if empty and not required
    if (transformedValue === undefined || transformedValue === null || transformedValue === '') {
      return errors;
    }
    
    // Type validation
    if (fieldSchema.type) {
      const error = await Promise.resolve(validators.type(
        fieldSchema.type,
        fieldSchema.messages?.type || this.customMessages[`type_${fieldSchema.type}`]
      )(transformedValue, context));
      if (error) errors.push(error);
    }
    
    // Min/Max validation
    if (fieldSchema.min !== undefined) {
      const error = await Promise.resolve(validators.min(
        fieldSchema.min,
        fieldSchema.messages?.min || this.customMessages.min
      )(transformedValue as number, context));
      if (error) errors.push(error);
    }
    
    if (fieldSchema.max !== undefined) {
      const error = await Promise.resolve(validators.max(
        fieldSchema.max,
        fieldSchema.messages?.max || this.customMessages.max
      )(transformedValue as number, context));
      if (error) errors.push(error);
    }
    
    // MinLength/MaxLength validation
    if (fieldSchema.minLength !== undefined) {
      const error = await Promise.resolve(validators.minLength(
        fieldSchema.minLength,
        fieldSchema.messages?.minLength || this.customMessages.minLength
      )(transformedValue as string, context));
      if (error) errors.push(error);
    }
    
    if (fieldSchema.maxLength !== undefined) {
      const error = await Promise.resolve(validators.maxLength(
        fieldSchema.maxLength,
        fieldSchema.messages?.maxLength || this.customMessages.maxLength
      )(transformedValue as string, context));
      if (error) errors.push(error);
    }
    
    // Pattern validation
    if (fieldSchema.pattern) {
      const error = await Promise.resolve(validators.pattern(
        fieldSchema.pattern,
        fieldSchema.messages?.pattern || this.customMessages.pattern
      )(transformedValue as string, context));
      if (error) errors.push(error);
    }
    
    // Enum validation
    if (fieldSchema.enum) {
      const enumValues = [...fieldSchema.enum] as unknown[];
      const error = await Promise.resolve(validators.enum(
        enumValues,
        fieldSchema.messages?.enum || this.customMessages.enum
      )(transformedValue, context));
      if (error) errors.push(error);
    }
    
    // Custom synchronous validators
    if (fieldSchema.custom) {
      for (const validator of fieldSchema.custom) {
        const validatorFn = validator as ValidatorFn<unknown>;
        const error = await Promise.resolve(validatorFn(transformedValue, context));
        if (error) errors.push(error);
      }
    }
    
    // Async validators
    if (fieldSchema.async) {
      const asyncResults = await Promise.all(
        fieldSchema.async.map(validator => {
          const validatorFn = validator as ValidatorFn<unknown>;
          return validatorFn(transformedValue, context);
        })
      );
      for (const error of asyncResults) {
        if (error) errors.push(error);
      }
    }
    
    return errors;
  }
  
  /**
   * Validate entire form
   */
  async validate(data: T): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    for (const field of Object.keys(this.schema) as Array<keyof T>) {
      const fieldErrors = await this.validateField(field, data[field], data);
      errors.push(...fieldErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get schema for a field
   */
  getFieldSchema(field: keyof T): FieldSchema<T[keyof T]> | undefined {
    return this.schema[field] as FieldSchema<T[keyof T]> | undefined;
  }
}

// ============================================================================
// Form Manager
// ============================================================================

export class FormManager<T extends Record<string, unknown>> {
  private state: FormState<T>;
  private schema: FormSchema<T>;
  private validator: SchemaValidator<T>;
  private listeners: Set<(state: FormState<T>) => void> = new Set();
  private validateOnChange: boolean;
  private validateOnBlur: boolean;
  
  constructor(
    initialValues: T,
    schema: FormSchema<T>,
    options: {
      validateOnChange?: boolean;
      validateOnBlur?: boolean;
      customMessages?: Record<string, string>;
    } = {}
  ) {
    this.schema = schema;
    this.validator = new SchemaValidator(schema, options.customMessages);
    this.validateOnChange = options.validateOnChange ?? true;
    this.validateOnBlur = options.validateOnBlur ?? true;
    
    this.state = {
      values: initialValues,
      errors: {} as Record<keyof T, ValidationError[]>,
      touched: new Set(),
      dirty: new Set(),
      isValid: true,
      isValidating: false,
      isSubmitting: false,
      submitCount: 0
    };
    
    // Initialize empty errors for each field
    for (const field of Object.keys(schema) as Array<keyof T>) {
      this.state.errors[field] = [];
    }
  }
  
  /**
   * Get current form state
   */
  getState(): FormState<T> {
    return { ...this.state };
  }
  
  /**
   * Get field value
   */
  getValue<K extends keyof T>(field: K): T[K] {
    return this.state.values[field];
  }
  
  /**
   * Set field value
   */
  async setValue<K extends keyof T>(field: K, value: T[K]): Promise<void> {
    this.state.values[field] = value;
    this.state.dirty.add(field);
    
    if (this.validateOnChange) {
      await this.validateField(field);
    }
    
    this.notify();
  }
  
  /**
   * Set multiple values
   */
  async setValues(values: Partial<T>): Promise<void> {
    for (const [field, value] of Object.entries(values)) {
      this.state.values[field as keyof T] = value as T[keyof T];
      this.state.dirty.add(field as keyof T);
    }
    
    if (this.validateOnChange) {
      await this.validateAll();
    }
    
    this.notify();
  }
  
  /**
   * Mark field as touched
   */
  async setTouched(field: keyof T): Promise<void> {
    this.state.touched.add(field);
    
    if (this.validateOnBlur) {
      await this.validateField(field);
    }
    
    this.notify();
  }
  
  /**
   * Validate a single field
   */
  async validateField(field: keyof T): Promise<ValidationError[]> {
    this.state.isValidating = true;
    this.notify();
    
    const errors = await this.validator.validateField(
      field,
      this.state.values[field],
      this.state.values
    );
    
    this.state.errors[field] = errors;
    this.state.isValid = this.calculateIsValid();
    this.state.isValidating = false;
    
    this.notify();
    return errors;
  }
  
  /**
   * Validate all fields
   */
  async validateAll(): Promise<ValidationResult> {
    this.state.isValidating = true;
    this.notify();
    
    const result = await this.validator.validate(this.state.values);
    
    // Group errors by field
    const errorsByField: Record<string, ValidationError[]> = {};
    for (const error of result.errors) {
      if (!errorsByField[error.field]) {
        errorsByField[error.field] = [];
      }
      errorsByField[error.field].push(error);
    }
    
    // Update state
    for (const field of Object.keys(this.schema) as Array<keyof T>) {
      this.state.errors[field] = errorsByField[field as string] || [];
    }
    
    this.state.isValid = result.valid;
    this.state.isValidating = false;
    
    this.notify();
    return result;
  }
  
  /**
   * Submit form
   */
  async submit(
    onSubmit: (values: T) => Promise<void> | void
  ): Promise<{ success: boolean; errors?: ValidationError[] }> {
    this.state.submitCount++;
    
    // Mark all fields as touched
    for (const field of Object.keys(this.schema) as Array<keyof T>) {
      this.state.touched.add(field);
    }
    
    // Validate all
    const result = await this.validateAll();
    
    if (!result.valid) {
      return { success: false, errors: result.errors };
    }
    
    // Submit
    this.state.isSubmitting = true;
    this.notify();
    
    try {
      await onSubmit(this.state.values);
      this.state.isSubmitting = false;
      this.notify();
      return { success: true };
    } catch (error) {
      this.state.isSubmitting = false;
      this.notify();
      
      const submitError: ValidationError = {
        field: '_form',
        message: error instanceof Error ? error.message : 'Submission failed',
        code: 'submit_error'
      };
      
      return { success: false, errors: [submitError] };
    }
  }
  
  /**
   * Reset form to initial values
   */
  reset(values?: T): void {
    if (values) {
      this.state.values = values;
    }
    
    this.state.touched = new Set();
    this.state.dirty = new Set();
    this.state.isValid = true;
    this.state.isValidating = false;
    this.state.isSubmitting = false;
    
    for (const field of Object.keys(this.schema) as Array<keyof T>) {
      this.state.errors[field] = [];
    }
    
    this.notify();
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: FormState<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Get field props for React integration
   */
  getFieldProps(field: keyof T) {
    return {
      name: field,
      value: this.state.values[field],
      onChange: (e: { target: { value: unknown } }) => this.setValue(field, e.target.value as T[keyof T]),
      onBlur: () => this.setTouched(field),
      'aria-invalid': this.state.errors[field]?.length > 0,
      'aria-describedby': `${String(field)}-error`
    };
  }
  
  /**
   * Get error message for field
   */
  getError(field: keyof T): string | null {
    const errors = this.state.errors[field];
    return errors && errors.length > 0 ? errors[0].message : null;
  }
  
  /**
   * Check if field has error
   */
  hasError(field: keyof T): boolean {
    return (this.state.errors[field]?.length || 0) > 0;
  }
  
  /**
   * Check if field was touched
   */
  isTouched(field: keyof T): boolean {
    return this.state.touched.has(field);
  }
  
  /**
   * Check if field is dirty
   */
  isDirty(field: keyof T): boolean {
    return this.state.dirty.has(field);
  }
  
  private calculateIsValid(): boolean {
    for (const errors of Object.values(this.state.errors)) {
      if ((errors as ValidationError[]).length > 0) return false;
    }
    return true;
  }
  
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compose multiple validators
 */
export function composeValidators<T>(...validators: ValidatorFn<T>[]): ValidatorFn<T> {
  return async (value, context) => {
    for (const validator of validators) {
      const error = await validator(value, context);
      if (error) return error;
    }
    return null;
  };
}

/**
 * Create conditional validator
 */
export function when<T>(
  condition: (value: T, context?: ValidationContext) => boolean,
  validator: ValidatorFn<T>
): ValidatorFn<T> {
  return (value, context) => {
    if (condition(value, context)) {
      return validator(value, context);
    }
    return null;
  };
}

/**
 * Create cross-field validator
 */
export function crossField<T extends Record<string, unknown>>(
  fields: (keyof T)[],
  validator: (values: Partial<T>) => ValidationError | null
): ValidatorFn<unknown> {
  return (_, context) => {
    if (!context) return null;
    
    const values: Partial<T> = {};
    for (const field of fields) {
      values[field] = context.formData[field as string] as T[keyof T];
    }
    
    return validator(values);
  };
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const commonSchemas = {
  email: {
    required: true,
    type: 'email' as const,
    maxLength: 255
  },
  
  password: {
    required: true,
    type: 'string' as const,
    minLength: 8,
    maxLength: 128,
    custom: [
      validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must contain uppercase, lowercase, and number'
      )
    ]
  },
  
  username: {
    required: true,
    type: 'string' as const,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    messages: {
      pattern: 'Username can only contain letters, numbers, and underscores'
    }
  },
  
  phone: {
    type: 'string' as const,
    custom: [validators.phone()]
  },
  
  url: {
    type: 'url' as const
  }
};

export default {
  validators,
  SchemaValidator,
  FormManager,
  composeValidators,
  when,
  crossField,
  commonSchemas
};
