import React, { useEffect, useState } from 'react';
import { FaCode, FaExternalLinkAlt, FaGithub } from 'react-icons/fa';
import { fetchProjectLanguages } from '../services/api';
import './TechStackPanel.css';

const LANGUAGE_COLORS = [
  '#6675ff', '#2ecc71', '#f39c12', '#e05c5c', '#8c4fff',
  '#1abc9c', '#3498db', '#e67e22', '#9b59b6', '#16a085',
];

export default function TechStackPanel({ project }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!project?.id || !project.githubRepoName) {
      setLanguages([]);
      setError('');
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError('');
    fetchProjectLanguages(project.id)
      .then(data => {
        if (!active) return;
        const entries = Object.entries(data || {})
          .filter(([, bytes]) => Number(bytes) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        const totalBytes = entries.reduce((sum, [, bytes]) => sum + Number(bytes), 0);
        setLanguages(entries.map(([name, bytes]) => ({
          name,
          percent: totalBytes ? (Number(bytes) / totalBytes) * 100 : 0,
          bytes: Number(bytes),
        })));
      })
      .catch(fetchError => {
        if (active) setError(fetchError.message || 'Unable to load repository languages.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [project?.id, project?.githubRepoName]);

  const owner = project?.githubOwner;
  const repoName = project?.githubRepoName;
  const repoPath = repoName?.replace(/^https:\/\/github\.com\//, '').replace(/\.git\/?$/, '').replace(/\/+$/, '');
  const repoUrl = repoPath
    ? `https://github.com/${owner ? `${owner}/${repoPath.split('/').pop()}` : repoPath}`
    : '';

  if (!project) return null;

  return (
    <section className="tech-stack-panel" aria-labelledby="tech-stack-title">
      <div className="tech-stack-heading">
        <div className="tech-stack-title-wrap">
          <span className="tech-stack-icon"><FaCode /></span>
          <div>
            <p className="tech-stack-eyebrow">Repository insights</p>
            <h2 id="tech-stack-title">Tech stack</h2>
          </div>
        </div>
        {repoUrl && (
          <a className="tech-stack-repo-link" href={repoUrl} target="_blank" rel="noreferrer">
            <FaGithub /> View repository <FaExternalLinkAlt className="tech-stack-external-icon" />
          </a>
        )}
      </div>

      <p className="tech-stack-description">
        Languages detected by GitHub from the repository’s source files.
      </p>

      {!project?.githubRepoName ? (
        <p className="tech-stack-message">No GitHub repository is linked to this project.</p>
      ) : loading ? (
        <p className="tech-stack-message" role="status">Loading repository tech stack...</p>
      ) : error ? (
        <p className="tech-stack-message tech-stack-error" role="alert">{error}</p>
      ) : languages.length === 0 ? (
        <p className="tech-stack-message">GitHub has no language data for this repository yet.</p>
      ) : (
        <div className="tech-stack-list">
          {languages.map((language, index) => (
            <div className="tech-stack-language" key={language.name}>
              <div className="tech-stack-language-meta">
                <span className="tech-stack-language-name">
                  <span
                    className="tech-stack-language-dot"
                    style={{ backgroundColor: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length] }}
                  />
                  {language.name}
                </span>
                <span className="tech-stack-language-percent">{language.percent.toFixed(1)}%</span>
              </div>
              <div
                className="tech-stack-track"
                role="meter"
                aria-label={`${language.name} share`}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={language.percent.toFixed(1)}
              >
                <span
                  className="tech-stack-fill"
                  style={{
                    width: `${language.percent}%`,
                    backgroundColor: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
