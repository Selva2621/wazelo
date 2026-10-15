import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DeveloperApiController } from '../controllers/developer-api.controller';
import { buildDeveloperOpenApiSpec } from './developer-openapi';

/** Every route on the API-key controller, as "method /developer/path/{param}". */
function controllerRoutes(): string[] {
  const base = Reflect.getMetadata(PATH_METADATA, DeveloperApiController) as string;
  const proto = DeveloperApiController.prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .map((name) => (proto as unknown as Record<string, () => void>)[name])
    .filter((handler) => Reflect.hasMetadata(PATH_METADATA, handler))
    .map((handler) => {
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
      const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number].toLowerCase();
      const openApiPath = `/${base}/${path}`.replace(/\/+/g, '/').replace(/:(\w+)/g, '{$1}');
      return `${method} ${openApiPath}`;
    });
}

describe('Developer API OpenAPI spec', () => {
  const spec = buildDeveloperOpenApiSpec('https://example.test');

  it('documents every Developer API route', () => {
    const documented = new Set(
      Object.entries(spec.paths).flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m} ${path}`)),
    );
    const routes = controllerRoutes();
    expect(routes.length).toBeGreaterThan(10);
    expect(routes.filter((r) => !documented.has(r))).toEqual([]);
  });

  it('does not document routes that no longer exist', () => {
    const routes = new Set(controllerRoutes());
    const documented = Object.entries(spec.paths).flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m} ${path}`));
    expect(documented.filter((d) => !routes.has(d))).toEqual([]);
  });

  it('points the server at the API prefix', () => {
    expect(spec.servers[0].url).toBe('https://example.test/api/v1');
  });
});
