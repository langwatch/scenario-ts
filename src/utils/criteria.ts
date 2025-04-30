import { log } from './logger';

export const evaluateCriteria = (criteria: string[], history: any[]): boolean => {
  log(`Evaluating criteria:`, criteria);
  return criteria.every(criterion => 
    history.some(msg => msg.content.includes(criterion))
  );
}; 