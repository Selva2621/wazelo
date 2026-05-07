import { Injectable } from '@nestjs/common';
import { AutomationConditionOperator } from '../value-objects/condition-operator.enum';

export interface EvaluationCondition {
  field: string;
  operator: AutomationConditionOperator;
  value: unknown;
}

export interface EvaluationContext {
  contact?: Record<string, unknown>;
  message?: Record<string, unknown>;
  conversation?: Record<string, unknown>;
  trigger?: Record<string, unknown>;
  widget?: Record<string, unknown>;
}

@Injectable()
export class ConditionEvaluatorService {
  evaluate(
    conditions: EvaluationCondition[] | null,
    context: EvaluationContext,
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) =>
      this.evaluateSingle(condition, context),
    );
  }

  private evaluateSingle(
    condition: EvaluationCondition,
    context: EvaluationContext,
  ): boolean {
    const actualValue = this.resolveField(condition.field, context);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case AutomationConditionOperator.EQUALS:
        return actualValue === expectedValue;

      case AutomationConditionOperator.NOT_EQUALS:
        return actualValue !== expectedValue;

      case AutomationConditionOperator.CONTAINS:
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
        }
        return false;

      case AutomationConditionOperator.IN:
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        return false;

      case AutomationConditionOperator.NOT_IN:
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue);
        }
        return true;

      default:
        return false;
    }
  }

  private resolveField(
    field: string,
    context: EvaluationContext,
  ): unknown {
    const parts = field.split('.');
    if (parts.length < 2) return undefined;

    const [scope, ...rest] = parts;
    const scopeData = context[scope as keyof EvaluationContext];

    if (!scopeData || typeof scopeData !== 'object') return undefined;

    let current: unknown = scopeData;
    for (const part of rest) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
