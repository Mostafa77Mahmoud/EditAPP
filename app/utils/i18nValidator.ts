
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

interface TranslationIssue {
  type: 'missing_key' | 'empty_value' | 'hardcoded_text' | 'fallback_used';
  location: string;
  key?: string;
  text?: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  issues: TranslationIssue[];
  summary: {
    totalKeys: number;
    missingKeys: number;
    emptyValues: number;
    hardcodedTexts: number;
  };
}

class I18nValidator {
  private issues: TranslationIssue[] = [];
  private checkedComponents = new Set<string>();

  // Get all translation keys from en.json (our base language)
  private getAllTranslationKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        keys = keys.concat(this.getAllTranslationKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Get nested value from object using dot notation
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Check if all English keys exist in Arabic translations
  validateTranslationCompleteness(): TranslationIssue[] {
    const issues: TranslationIssue[] = [];
    const englishKeys = this.getAllTranslationKeys(enTranslations);
    
    console.log(`🔍 Validating ${englishKeys.length} translation keys...`);
    
    for (const key of englishKeys) {
      const englishValue = this.getNestedValue(enTranslations, key);
      const arabicValue = this.getNestedValue(arTranslations, key);
      
      // Check if key exists in Arabic
      if (arabicValue === undefined) {
        issues.push({
          type: 'missing_key',
          location: `ar.json`,
          key,
          severity: 'error'
        });
      }
      
      // Check for empty values
      if (typeof englishValue === 'string' && englishValue.trim() === '') {
        issues.push({
          type: 'empty_value',
          location: `en.json`,
          key,
          severity: 'warning'
        });
      }
      
      if (typeof arabicValue === 'string' && arabicValue.trim() === '') {
        issues.push({
          type: 'empty_value',
          location: `ar.json`,
          key,
          severity: 'warning'
        });
      }
    }
    
    return issues;
  }

  // Create a wrapper for useLanguage to track translation usage
  createTranslationTracker(): () => any {
    const validator = this;
    
    return function useTrackedLanguage() {
      const languageContext = useLanguage();
      const originalT = languageContext.t;
      
      // Override the t function to track usage
      const trackedT = (key: string, params?: Record<string, any>) => {
        // Log translation access
        const result = originalT(key);
        
        // Check if translation was found
        if (result === key) {
          console.warn(`⚠️ Translation fallback used for key: "${key}"`);
        }
        
        // Check if key exists in translations
        const englishValue = validator.getNestedValue(enTranslations, key);
        if (englishValue === undefined) {
          console.error(`❌ Missing translation key: "${key}"`);
        }
        
        return result;
      };
      
      return {
        ...languageContext,
        t: trackedT
      };
    };
  }

  // Validate a specific component
  validateComponent(componentName: string, componentCode: string): TranslationIssue[] {
    if (this.checkedComponents.has(componentName)) {
      return [];
    }
    
    this.checkedComponents.add(componentName);
    const issues: TranslationIssue[] = [];
    
    console.log(`🔍 Validating component: ${componentName}`);
    
    // Look for hardcoded strings that should be translated
    const hardcodedStringRegex = /(['"`])([^'"`\n]{3,})(['"`])/g;
    const matches = componentCode.matchAll(hardcodedStringRegex);
    
    for (const match of matches) {
      const text = match[2];
      
      // Skip if it's likely a variable, class name, or technical string
      if (this.shouldTranslate(text)) {
        issues.push({
          type: 'hardcoded_text',
          location: componentName,
          text,
          severity: 'warning'
        });
      }
    }
    
    // Look for t('...') calls and validate keys
    const translationCallRegex = /t\(\s*['"`]([^'"`]+)['"`]/g;
    const translationMatches = componentCode.matchAll(translationCallRegex);
    
    for (const match of translationMatches) {
      const key = match[1];
      const englishValue = this.getNestedValue(enTranslations, key);
      
      if (englishValue === undefined) {
        issues.push({
          type: 'missing_key',
          location: componentName,
          key,
          severity: 'error'
        });
      }
    }
    
    return issues;
  }

  // Determine if a string should be translated
  private shouldTranslate(text: string): boolean {
    // Skip technical strings, variable names, etc.
    const skipPatterns = [
      /^[a-z]+([A-Z][a-z]*)*$/, // camelCase
      /^[A-Z_]+$/, // CONSTANTS
      /^\d+$/, // numbers
      /^#[0-9a-fA-F]{3,8}$/, // hex colors
      /^[a-z-]+$/, // CSS classes
      /^https?:\/\//, // URLs
      /^data:/, // data URLs
      /^[a-z]+\.[a-z]+/, // file extensions or namespaced vars
      /^[A-Z][a-z]*Screen$/, // Screen component names
      /^\w+\.\w+/, // object.property patterns
    ];
    
    // Skip short strings
    if (text.length < 3) return false;
    
    // Skip if matches any skip pattern
    if (skipPatterns.some(pattern => pattern.test(text))) return false;
    
    // Skip if it's mostly symbols or numbers
    if (!/[a-zA-Z]/.test(text) || text.replace(/[a-zA-Z\s]/g, '').length > text.length / 2) {
      return false;
    }
    
    return true;
  }

  // Get validation summary
  getValidationSummary(): ValidationResult {
    const completenessIssues = this.validateTranslationCompleteness();
    const allIssues = [...completenessIssues, ...this.issues];
    
    const summary = {
      totalKeys: this.getAllTranslationKeys(enTranslations).length,
      missingKeys: allIssues.filter(i => i.type === 'missing_key').length,
      emptyValues: allIssues.filter(i => i.type === 'empty_value').length,
      hardcodedTexts: allIssues.filter(i => i.type === 'hardcoded_text').length,
    };
    
    return {
      isValid: allIssues.filter(i => i.severity === 'error').length === 0,
      issues: allIssues,
      summary
    };
  }

  // Generate detailed report
  generateReport(): void {
    const result = this.getValidationSummary();
    
    console.log('\n🌍 === i18n Validation Report ===');
    console.log(`📊 Total Translation Keys: ${result.summary.totalKeys}`);
    console.log(`❌ Missing Keys: ${result.summary.missingKeys}`);
    console.log(`⚠️ Empty Values: ${result.summary.emptyValues}`);
    console.log(`🔤 Hardcoded Text Found: ${result.summary.hardcodedTexts}`);
    console.log(`✅ Overall Status: ${result.isValid ? 'VALID' : 'NEEDS ATTENTION'}`);
    
    if (result.issues.length > 0) {
      console.log('\n📝 Issues Found:');
      
      const groupedIssues = result.issues.reduce((groups, issue) => {
        groups[issue.type] = groups[issue.type] || [];
        groups[issue.type].push(issue);
        return groups;
      }, {} as Record<string, TranslationIssue[]>);
      
      for (const [type, issues] of Object.entries(groupedIssues)) {
        console.log(`\n${this.getTypeEmoji(type)} ${type.toUpperCase()}:`);
        issues.forEach(issue => {
          console.log(`  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.location}${issue.key ? ` - Key: "${issue.key}"` : ''}${issue.text ? ` - Text: "${issue.text}"` : ''}`);
        });
      }
    }
    
    console.log('\n=================================\n');
  }

  private getTypeEmoji(type: string): string {
    switch (type) {
      case 'missing_key': return '🔑';
      case 'empty_value': return '📝';
      case 'hardcoded_text': return '🔤';
      case 'fallback_used': return '🔄';
      default: return '❓';
    }
  }

  // Clear validation state
  reset(): void {
    this.issues = [];
    this.checkedComponents.clear();
  }
}

// Singleton instance
export const i18nValidator = new I18nValidator();

// React hook for component validation
export const useI18nValidation = (componentName: string) => {
  React.useEffect(() => {
    if (__DEV__) {
      // In development, validate the component
      // This would need the component source code to work fully
      console.log(`🔍 i18n validation enabled for ${componentName}`);
    }
  }, [componentName]);
};

// Validation utilities
export const validateAllTranslations = () => {
  if (__DEV__) {
    i18nValidator.generateReport();
  }
};

export const createI18nDevTools = () => {
  if (__DEV__) {
    // Create development tools for translation validation
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    // Override console methods to catch translation issues
    console.warn = (...args) => {
      if (args[0]?.includes?.('Translation fallback')) {
        (i18nValidator as any).issues.push({
          type: 'fallback_used',
          location: 'Runtime',
          text: args[0],
          severity: 'warning'
        });
      }
      originalConsoleWarn(...args);
    };
    
    console.error = (...args) => {
      if (args[0]?.includes?.('Missing translation')) {
        (i18nValidator as any).issues.push({
          type: 'missing_key',
          location: 'Runtime',
          text: args[0],
          severity: 'error'
        });
      }
      originalConsoleError(...args);
    };
    
    // Return cleanup function
    return () => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }
  
  return () => {};
};

export default i18nValidator;
